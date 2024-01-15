# frida的基本使用

> 参考文章[Android之Frida框架完全使用指南_android frida-CSDN博客](https://blog.csdn.net/qq_38474570/article/details/120876120)<br>推荐下载书的网站:[无名图书 | 一个好看的电子书网站 (book123.info)](https://www.book123.info/)

## 映射端口:

```shell
adb forward tcp:xxxx tcp:xxxx
```

## pc查询手机的进程

```shell
frida-ps -U
```

## hook相关

### hook js脚本

#### 附着脚本

- 启动并且附带脚本

```shell
frida -U -f xxxxxx.apk -l xxx.js --no-pause
```

> 这里的--no-pause意思是在程序启动后不要停止程序的进程

- 这里也可以在启动后再 去hook脚本

```shell
frida -U -f xxxxx.apk --no-pause
%load xxxx.js
```

### js代码的书写

#### 使用java的平台

```js
使用java平台—>Java.perform(function () {});
```

> 相当于向java层提供了一个callback函数 以便于交互

#### 获取指定的java类

```js
Java.use(className)
```

- 这里引用一下参考文章的列子 

  - 当我们获取到Java类之后，我们直接通过 `<wrapper>.<method>.implementations =function() {}`的方式来hook wrapper类的method方法，不管是实例方法还是静态方法都可以

  - ```js
    function main()
    {
         //使用java平台
         Java.perform(
            function() {
                //获取java类
                var student=Java.use("com.example.hookdemo01.Student");
                //hook Add方法(重写Add方法) 
                student.Add.implementation=function(a,b)
                {
                    //修改参数
                    a=123;
                    b=456;
                    //调用原来的函数
                    var res = this.Add(a,b);
                    //输出结果
                    console.log(a,b,res);
                    return res;
                }
            }
    
         );
    }
    setImmediate(main)
    
    ```

#### 调用原本的函数

> 上面举的列子 中出现了调用原本的函数 所以我们其实可以在callback函数里面用this.FUNCTION_NAME来调用原本的函数

```js
<wrapper>.<method>.implementations =function() {
	this.<method>();
}
```

#### hook重载函数

> 这里重载函数是java里面的一个特性 就是同一个函数名字 不同的参数列表 可以构造多个同名字的函数 <br>在调用的时候只需要修改参数就可以实现调用不同的实现<br>由于函数名字是一样的所以我猜测frida就难以仅仅靠一个名字来实现hook了 所以我们需要overload标明参数

- 类似文章中举列子的一样

  - 要hook的代码

    ```java
    public class Student {
    	static public int Add(int a,int b){
    		return a+b;
    	}
    	static public String test(){
    		return "test";
    	}
    	// 要hook的函数
    	static public String test(int num){
    		return "test2--"+num;
    	}
        static public String test(String str){
            return str;
        }
    }
    ```

  - js代码

    ```js
    //hook重载方法
    function hookTest1()
    {
        //获取java类
        var student=Java.use("com.example.hookdemo01.Student");
        //hook test
        student.test.overload('int').implementation=function(a)
        {
            //修改参数
            a=123;
            //调用原来的函数 
            var res = this.test(a);
           
            //输出结果
            console.log(a,res);
            return res;
        }
    }
    ```

- 获取某个重载函数的全部数量

  ```js
  <class>.<function>.overloads.length;
  ```

- 用提取数组的方式依次hook这些重载函数

  ```js
  //hook所有重载函数
  function hookTest2()
  {
      //获取java类
      var student=Java.use("com.example.hookdemo01.Student");
      //重载方法的个数
      var overlength=student.test.overloads.length;
      //循环hook所有重载方法
      for(var i=0;i<overlength;i++)
      {
          student.test.overloads[i].implementation=function()
          {
              //打印参数个数
              console.log(arguments.length);
              return this.test.apply(this,arguments);
          }
      }
      
  }
  
  ```

  

#### hook构造方法

> 这里先解释一下什么是构造方法<br>java中类在定义的时候 程序员可以选择显性地去书写和类同名地一个public方法 也可以不写 java会自动给你补上(粗鄙理解)<br>这个方法有什么用呢 就是在这个类实列化的时候 触发 完成类似于初始化的操作<br>比如现在我有类`Student`那么我在Student a = new Student();的时候相当于会自动去调用函数:`a.Student();`<br>由于这个是开发知识就不细讲了()

- 稍微举列子:

```java
package dick;

public class Test {
	public Test() {
		System.out.print("test");
	}
}
public class dick {
	public static void main (String[] args) {
		Test a = new Test();
	}
}
// 结果:test

```

- 对应js的写法

  ```js
  //hook构造函数
  function hookTest3()
  {
      //获取java类
      var student=Java.use("com.example.hookdemo01.Test");
      
      student.$init.implementation=function()
      {      
          //调用原函数
          this.$init(name,age);
  
          //调用构造函数
          //student.$new("guishou",888);
  
      }
        
  }
  ```
  

#### 修改类的字段

> 这里的字段指的是类中定义的成员属性<br>然后这里修改非静态的字段用到的是java.choose函数 这个函数第一个`参数`就是我们要遍历的类<br>随后我们放入一个类似于回调函数的对象进去<br>这个对象包含:
>
> - `onMatch`
>   - 这个key对应的value是一个`callback`函数 这里会去找到程序中所有实现了指定类的对象 也就是找到所有类型为这个类的对象
>   - 相当于遍历 没找到一个对象就会触发这个callback 所以在callback函数中我们的操作对象是每一个对象
> - `onCompete`
>   - 这个key对应的value也是一个`callback`函数 在整个搜索流程完成的时候会调用

```java
import java.lang.System.Logger;

public class Student {
    public String name;
    public int age;
    private int number;
    private static String nickname = "Flags";
    public Student (String name,int age){
        this.age = age;
        this.name = name;
    }
    public void PrintStudent(){
        this.number = 888;
        Log.d(this.name,"nickName:"+this.nickname+"number:"+this.number);
    }
     public static void main(String[] args) {
        System.out.println("Hello World");
    }
}
```

- 我们这里选择修改`nickname`这个属性

```js
//修改类字段
function hookTest4()
{
    //获取java类
    var student=Java.use("com.example.hookdemo01.Student");
     //修改静态字段
    student.nickname.value="GuiShouFlags";
    console.log(student.nickname.value);
    
    //修改非静态字段
    Java.choose("com.example.hookdemo01.Student",{
        //每遍历一个对象都会调用onMatch
        onMatch:function(obj)
        {
            //修改每个对象的字段
            obj.number.value=999;
            console.log(obj.number.value);
            
            //字段名和函数名相同需要加下划线
            //obj._number.value=999;
        },
        //遍历完成后调用onComplete
        onComplete:function()
        {

        }
    }); 
}
```

#### 枚举所有的类和方法

> 这里很多前提知识

```js
function hookTest6()
{
    //枚举已经加载的类 异步方式
    Java.enumerateLoadedClasses({
        //每枚举一个类调用一次
        onMatch:function(name,handler)
        {
            //对类名进行过滤 
            if(name.indexOf("com.example.hookdemo01")!=-1)
            {
                //输出类名
                console.log(name);

                //根据类名获取java类
                var clz=Java.use(name);
                //获取类的所有方法
                var methods=clz.class.getDeclaredMethods();
                
                //循环输出所有方法
                for(var i=0;i<methods.length();i++)
                {
                    console.log(methods[i]);
                }
            }
            
        },
        //枚举完成以后调用
        onComplete:function()
        {

        }
    });  
    
    //枚举已经加载的类 同步方式
    var classes=Java.enumerateClassLoadersSync();
    for(var i=0;i<methods.classes();i++)
    {
        if(classes[i].indexOf("com.example.hookdemo01")!=-1)
        {
            console.log(classes[i]);
            //枚举方法同上...
        }
    }

  
}

```

#### hook so中的函数

> 这里如果这个函数不是`导出函数`则我们通过偏移来获取这个函数<br>这个步骤 就是算偏移嘛(应该 错了别打我) libcBaseAddr + offset

```js
//hook无导出函数
function hookTest9()
{
    //so名称
    var so_name="libnative-lib.so";
    //要Hook的函数偏移
    var fun_off=0x7078;

   //加载到内存后，函数地址=so地址+函数偏移
   var so_base_addr=Module.findBaseAddress(so_name);
   var add_func=parseInt(so_base_addr,16)+fun_off;
   var ptr_fun=new NativePointer(add_func);

 
    Interceptor.attach(ptr_fun,{
        //在hook函数之前执行
        onEnter:function(args)
        {
            console.log("hook enter");
        },
        //在hook函数之后执行
        onLeave:function(retval)
        {
            console.log("hook leaver");
        }

    });     
}
```

